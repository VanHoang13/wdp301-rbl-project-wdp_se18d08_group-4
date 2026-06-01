import '../../domain/booking_models.dart';

class BookingFlowState {
  const BookingFlowState({
    this.serviceType = BookingServiceType.fullMove,
    this.pickup = 'Ký túc xá Khu B',
    this.destination = '',
    this.selectedTier = ServiceTier.standard,
    this.selectedPartnerId,
    this.selectedLaborProviderId,
    this.paymentMethod = PaymentMethod.payos,
    this.discountCode = '',
    this.discountApplied = false,
    this.loadingPlaces = false,
    this.loadingPartners = false,
    this.loadingLaborQuotes = false,
    this.recentPlaces = const [],
    this.packages = const [],
    this.partners = const [],
    this.laborQuotes = const [],
    this.helperCount = 0,
    this.laborHours = 2,
    this.floorCount = 0,
    this.hasElevator = true,
    this.laborNote = '',
    this.linkedOrderId,
    this.linkedOrderNumber,
    this.linkedProviderName,
    this.quickCompareEntry = false,
    this.extraComboLaborCount = 0,
  });

  final BookingServiceType serviceType;
  final String pickup;
  final String destination;
  final ServiceTier selectedTier;
  final String? selectedPartnerId;
  final String? selectedLaborProviderId;
  final PaymentMethod paymentMethod;
  final String discountCode;
  final bool discountApplied;
  final bool loadingPlaces;
  final bool loadingPartners;
  final bool loadingLaborQuotes;
  final List<RecentPlace> recentPlaces;
  final List<ServicePackage> packages;
  final List<PartnerOffer> partners;
  final List<LaborProviderQuote> laborQuotes;
  final int helperCount;
  final int laborHours;
  final int floorCount;
  final bool hasElevator;
  final String laborNote;
  final String? linkedOrderId;
  final String? linkedOrderNumber;
  final String? linkedProviderName;

  /// Vào từ "So sánh báo giá" trên Home — đã có địa điểm mẫu, bỏ qua bước chọn điểm.
  final bool quickCompareEntry;

  /// Số người khuân vác thêm (ngoài số đã có trong combo).
  final int extraComboLaborCount;

  bool get isLaborOnly => serviceType == BookingServiceType.laborOnly;

  bool get isLaborAddon => serviceType == BookingServiceType.laborAddon;

  bool get isLaborService => isLaborOnly || isLaborAddon;

  bool get requiresHelpers => isLaborService;

  ServicePackage? get selectedPackage {
    for (final p in packages) {
      if (p.tier == selectedTier) return p;
    }
    return null;
  }

  PartnerOffer? get selectedPartner {
    if (selectedPartnerId == null) return null;
    for (final p in partners) {
      if (p.id == selectedPartnerId) return p;
    }
    return null;
  }

  LaborProviderQuote? get selectedLaborProvider {
    if (selectedLaborProviderId == null) return null;
    for (final q in laborQuotes) {
      if (q.id == selectedLaborProviderId) return q;
    }
    return null;
  }

  int get baseLaborFee =>
      isLaborService ? helperCount * laborHours * LaborPricing.perHelperPerHour : 0;

  /// Tạm tính trước khi chọn đối tác (chưa gồm markup marketplace).
  int get laborFee => baseLaborFee;

  int get floorFee => isLaborService && !hasElevator && floorCount > 0
      ? floorCount * LaborPricing.perFloorNoElevator
      : 0;

  /// Giá khuân vác từ đối tác đã chọn (marketplace).
  int get laborQuotedPrice =>
      selectedLaborProvider?.price ?? (baseLaborFee + floorFee);

  int get movePackagePrice => isLaborService ? 0 : (selectedPackage?.price ?? 450000);

  int get comboExtraLaborFee {
    if (isLaborService) return 0;
    final pkg = selectedPackage;
    if (pkg == null) return 0;
    return extraComboLaborCount * pkg.extraLaborComboPrice;
  }

  int get subtotal {
    if (isLaborService) return laborQuotedPrice;
    return movePackagePrice + comboExtraLaborFee;
  }

  int get discount => discountApplied ? 35000 : 0;

  int get serviceFee => 0;

  int get total => subtotal - discount + serviceFee;

  BookingFlowState copyWith({
    BookingServiceType? serviceType,
    String? pickup,
    String? destination,
    ServiceTier? selectedTier,
    String? selectedPartnerId,
    String? selectedLaborProviderId,
    PaymentMethod? paymentMethod,
    String? discountCode,
    bool? discountApplied,
    bool? loadingPlaces,
    bool? loadingPartners,
    bool? loadingLaborQuotes,
    List<RecentPlace>? recentPlaces,
    List<ServicePackage>? packages,
    List<PartnerOffer>? partners,
    List<LaborProviderQuote>? laborQuotes,
    int? helperCount,
    int? laborHours,
    int? floorCount,
    bool? hasElevator,
    String? laborNote,
    String? linkedOrderId,
    String? linkedOrderNumber,
    String? linkedProviderName,
    bool? quickCompareEntry,
    int? extraComboLaborCount,
    bool clearLinkedOrder = false,
  }) {
    return BookingFlowState(
      serviceType: serviceType ?? this.serviceType,
      pickup: pickup ?? this.pickup,
      destination: destination ?? this.destination,
      selectedTier: selectedTier ?? this.selectedTier,
      selectedPartnerId: selectedPartnerId ?? this.selectedPartnerId,
      selectedLaborProviderId: selectedLaborProviderId ?? this.selectedLaborProviderId,
      paymentMethod: paymentMethod ?? this.paymentMethod,
      discountCode: discountCode ?? this.discountCode,
      discountApplied: discountApplied ?? this.discountApplied,
      loadingPlaces: loadingPlaces ?? this.loadingPlaces,
      loadingPartners: loadingPartners ?? this.loadingPartners,
      loadingLaborQuotes: loadingLaborQuotes ?? this.loadingLaborQuotes,
      recentPlaces: recentPlaces ?? this.recentPlaces,
      packages: packages ?? this.packages,
      partners: partners ?? this.partners,
      laborQuotes: laborQuotes ?? this.laborQuotes,
      helperCount: helperCount ?? this.helperCount,
      laborHours: laborHours ?? this.laborHours,
      floorCount: floorCount ?? this.floorCount,
      hasElevator: hasElevator ?? this.hasElevator,
      laborNote: laborNote ?? this.laborNote,
      linkedOrderId: clearLinkedOrder ? null : (linkedOrderId ?? this.linkedOrderId),
      linkedOrderNumber:
          clearLinkedOrder ? null : (linkedOrderNumber ?? this.linkedOrderNumber),
      linkedProviderName:
          clearLinkedOrder ? null : (linkedProviderName ?? this.linkedProviderName),
      quickCompareEntry: quickCompareEntry ?? this.quickCompareEntry,
      extraComboLaborCount: extraComboLaborCount ?? this.extraComboLaborCount,
    );
  }
}
